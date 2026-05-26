import DatabaseManager from '../data/DatabaseManager.js';
import ModalController from '../ui/ModalController.js';
import DiagramRenderer from '../ui/DiagramRenderer.js';

const normalizarFiltro = (texto) => (texto || '').toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

const OPEX_CONFIG = {
    cfe: { label: 'CFE', montoFijo: 5250000 },
    internetFibra: { label: 'Internet fibra', montoFijo: 256500 },
    internetSatelital: { label: 'Internet redundancia (satelital)', montoFijo: 540000 },
    licTeltonika: { label: 'Licencia Teltonika', montoFijo: 27000 },
    licTeamViewer: { label: 'Licencia TeamViewer', montoFijo: 134460 },
    licCMS: { label: 'Licencia CMS', montoFijo: 135000 },
    licHikvision: { label: 'Licencia Hikvision', montoFijo: 70555 },
    licUPS: { label: 'Licencia de portal de UPS', montoFijo: 7560 },
    licQTM: { label: 'Licencia QTM', montoFijo: 210600 },
    pauta: { label: 'Programacion de Pauta', montoFijo: 1144520 },
    gasolina: { label: 'Gasolina', montoFijo: 124388 },
    transporte: { label: 'Transporte', montoFijo: 149766 }
};

const CAPEX_CONFIG = {
    costoPantalla: { label: 'Pantalla', cantidad: 103, montoFijo: 32720000 },
    costoEstructura: { label: 'Estructura', cantidad: 54, montoFijo: 20800000 },
    costoMedidor: { label: 'Medidor CFE', cantidad: 54, montoFijo: 2052000 },
    costoInstalacion: { label: 'Instalacion electrica', cantidad: 54, montoFijo: 2160000 },
    novastar: { label: 'Sending card', cantidad: 54, montoFijo: 162000 },
    ups: { label: 'UPS', cantidad: 54, montoFijo: 280800 },
    nuc: { label: 'NUC', cantidad: 54, montoFijo: 712000 },
    pastillaTri: { label: 'Interruptor termomagnetico trifasica 3x100 amp', cantidad: 54, montoFijo: 193169 },
    pastilla20A: { label: 'Interruptor termomagnetico 2x20 amp', cantidad: 432, montoFijo: 86400 },
    camara: { label: 'Camara', cantidad: 103, montoFijo: 618000 },
    teltonika: { label: 'Rut 955', cantidad: 54, montoFijo: 675000 },
    poe: { label: 'Poe', cantidad: 103, montoFijo: 113300 }
};

export default class AppController {
    constructor() {
        this.formatMoney = (num) => new Intl.NumberFormat('es-MX', { 
            style: 'currency', currency: 'MXN', maximumFractionDigits: 0 
        }).format(num);

        this.dbManager = new DatabaseManager();
        this.modalCtrl = new ModalController(this.formatMoney);
        this.renderer = new DiagramRenderer();
        
        this.state = { 
            unidad: '', modulo: '', subModulo: '', componente: '', pantalla: '', meses: ['all'], filtroActivo: null
        };

        window.addEventListener('resize', () => this.renderer.drawLines());
        window.app = this;

        setTimeout(() => {
            document.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const target = e.target.dataset.target;
                    if (target) this.cerrarModal(target);
                });
            });
        }, 100);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modalesActivos = document.querySelectorAll('.modal.active');
                if (modalesActivos.length > 0) {
                    modalesActivos.forEach(m => m.classList.remove('active'));
                    return;
                }
                const compKey = this.state.componente;
                if (compKey) {
                    const panelDetalle = document.getElementById(`panel-detalle-${compKey}`);
                    const panelLista = document.getElementById(`panel-lista-${compKey}`);
                    const panelDesglose = document.getElementById(`panel-desglose-${compKey}`);
                    const panelEmpty = document.getElementById(`panel-empty-${compKey}`);
                    const panelFicha = document.getElementById(`panel-ficha-${compKey}`);
                    
                    if (panelDetalle && panelDetalle.style.display !== 'none') {
                        panelDetalle.style.display = 'none';
                        if (panelLista) {
                            panelLista.querySelectorAll('.ubicacion-item').forEach(item => {
                                item.style.background = '#fff';
                                item.style.border = '1px solid #e2e8f0';
                            });
                            this.centrarPanel(panelLista, compKey);
                        }
                        return;
                    }
                    if (panelLista && panelLista.style.display !== 'none') {
                        panelLista.style.display = 'none';
                        if (panelDesglose && panelDesglose.style.display !== 'none') {
                            panelDesglose.querySelectorAll('.desglose-card, div[onclick*="mostrarUbicacionesFinales"]').forEach(el => {
                                el.style.borderLeft = '1px solid #e2e8f0';
                                el.style.background = '#fff';
                            });
                            this.centrarPanel(panelDesglose, compKey);
                            return;
                        }
                    }
                    if (panelDesglose && panelDesglose.style.display !== 'none') {
                        panelDesglose.style.display = 'none';
                        if (panelEmpty) panelEmpty.style.display = 'flex';
                        if (this.state.filtroActivo) {
                            const elDOM = this.state.filtroActivo.DOM;
                            if (elDOM && document.body.contains(elDOM)) {
                                elDOM.classList.remove('active-filter');
                                if (elDOM.classList.contains('ficha-filter-row')) {
                                    elDOM.style.background = 'transparent';
                                    elDOM.style.paddingLeft = '12px'; 
                                    elDOM.style.borderLeft = 'none';
                                } else {
                                    elDOM.style.background = '#fff';
                                    elDOM.style.borderColor = '#e2e8f0';
                                }
                            }
                            this.state.filtroActivo = null;
                        }
                        if (panelFicha) this.centrarPanel(panelFicha, compKey);
                        return;
                    }
                }
                const columnas = document.querySelectorAll('.column');
                if (columnas.length > 1) {
                    const maxLvl = Array.from(columnas).reduce((max, col) => Math.max(max, parseInt(col.dataset.lvl)), 1);
                    this.cerrarPanel(maxLvl); 
                    setTimeout(() => {
                        const colAnterior = document.querySelector(`.column[data-lvl="${maxLvl - 1}"]`);
                        if(colAnterior) colAnterior.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }, 50);
                } else if (document.getElementById('canvas-view') && document.getElementById('canvas-view').classList.contains('active')) {
                    this.volver();
                }
            }
        });
    }

    formatearFechaCorta(fechaLarga) {
        if (!fechaLarga || String(fechaLarga).trim() === '' || String(fechaLarga).toLowerCase() === 'n/a') return null;
        if (!isNaN(fechaLarga)) return { clave: "abr 2026" };
        const meses = {
            'enero': 'ene', 'febrero': 'feb', 'marzo': 'mar', 'abril': 'abr',
            'mayo': 'may', 'junio': 'jun', 'julio': 'jul', 'agosto': 'ago',
            'septiembre': 'sep', 'octubre': 'oct', 'noviembre': 'nov', 'diciembre': 'dic'
        };
        const texto = String(fechaLarga).toLowerCase().trim();
        for (const [mesCompleto, mesCorto] of Object.entries(meses)) {
            if (texto.includes(mesCompleto)) {
                const matchAño = texto.match(/\b(20\d{2})\b/);
                const año = matchAño ? matchAño[1] : '';
                return { clave: `${mesCorto} ${año}` };
            }
        }
        return { clave: String(fechaLarga).trim() };
    }

    centrarPanel(elementoDOM, key) {
        if (!elementoDOM) return;
        setTimeout(() => {
            const col = elementoDOM.closest('.column');
            if (col) col.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            const container = document.getElementById(`panels-container-${key}`);
            if (container) {
                const offset = elementoDOM.offsetLeft - (container.clientWidth / 2) + (elementoDOM.clientWidth / 2);
                container.scrollTo({ left: offset, behavior: 'smooth' });
            } else {
                elementoDOM.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }, 150); 
    }

    async arrancarAplicacion() {
        await this.dbManager.cargarDatosJSON();
        this.initBuscador();
    }

    iniciar(unidad, theme) {
        this.state.unidad = unidad;
        const root = document.documentElement;
        const colors = { eco: '--eco-main', vv: '--vv-main', bb: '--bb-main' };
        const lights = { eco: '--eco-light', vv: '--vv-light', bb: '--bb-light' };

const logos = { 
    eco: 'https://jxwdncxtnhmrufvdxuti.supabase.co/storage/v1/object/public/banners-publicos/ecovallas.png', 
    vv: 'https://jxwdncxtnhmrufvdxuti.supabase.co/storage/v1/object/public/banners-publicos/viaverde.png', 
    bb: 'https://jxwdncxtnhmrufvdxuti.supabase.co/storage/v1/object/public/banners-publicos/biobox.png' 
};        root.style.setProperty('--theme-color', `var(${colors[theme]})`);
        root.style.setProperty('--theme-light', `var(${lights[theme]})`);
        const lblUnidad = document.getElementById('lbl-unidad');
        if (lblUnidad) {
            const numPantallas = this.dbManager.getPantallasPorUnidad(unidad).length;
            lblUnidad.innerHTML = `<img src="${logos[theme]}" alt="${unidad}" style="max-height: 45px; width: auto; object-fit: contain; vertical-align: middle; margin-right: 10px;"> 
            <span style="font-size:1rem; font-weight:800; color:var(--theme-color);">(${numPantallas} Equipos)</span>`;
        }
        document.getElementById('intro-view').classList.add('fade-out');
        document.getElementById('canvas-view').classList.add('active');
        this.renderMultiMonthSelector();
        this.construirNivel1();
    }

    volver() {
        document.getElementById('intro-view').classList.remove('fade-out');
        document.getElementById('canvas-view').classList.remove('active');
        const selector = document.getElementById('month-selector-container');
        if (selector) selector.style.display = 'none';
        this.renderer.clearAll();
    }

    cerrarPanel(nivel) {
        if (nivel === 5) this.state.pantalla = '';
        if (nivel === 4) { this.state.componente = ''; this.state.pantalla = ''; this.state.filtroActivo = null; }
        this.renderer.removeColumnsAfter(nivel - 1);
        this.renderer.deselectNodes(nivel - 1);
    }

    cerrarModal(idModal) {
        const modal = document.getElementById(idModal);
        if (modal) modal.classList.remove('active');
    }

    renderMultiMonthSelector() {
        let container = document.getElementById('month-selector-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'month-selector-container';
            container.style.cssText = 'background: white; padding: 8px 15px; border-radius: 8px; border: 1px solid var(--theme-light); font-family: sans-serif; display: flex; align-items: center; gap: 15px; margin-left: 20px;';
            container.innerHTML = `
                <label style="font-weight: 900; color: var(--theme-color); font-size: 0.85rem; margin:0; text-transform:uppercase;">Filtrar Meses:</label>
                <div style="display:flex; gap: 12px; font-size: 0.85rem; font-weight: 600; color: #475569;" id="multi-month-checks">
                    <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" value="all" checked> Consolidado</label>
                    <div style="width: 1px; background: #cbd5e1; height: 15px;"></div>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" value="enero"> Ene</label>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" value="febrero"> Feb</label>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" value="marzo"> Mar</label>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" value="abril"> Abr</label>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" value="mayo"> May</label>
                </div>`;
            const searchInput = document.getElementById('global-search');
            if (searchInput && searchInput.parentElement) searchInput.parentElement.insertAdjacentElement('afterend', container);
            else document.getElementById('canvas-view').appendChild(container);
            container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', (e) => this.cambiarMultiMes(e.target));
            });
        }
        container.style.display = 'flex';
    }

    cambiarMultiMes(clickedCheckbox) {
        const checkboxes = document.querySelectorAll('#multi-month-checks input[type="checkbox"]');
        if (clickedCheckbox.value === 'all' && clickedCheckbox.checked) {
            checkboxes.forEach(cb => { if(cb.value !== 'all') cb.checked = false; });
            this.state.meses = ['all'];
        } else {
            document.querySelector('#multi-month-checks input[value="all"]').checked = false;
            let seleccionados = [];
            checkboxes.forEach(cb => { if (cb.checked) seleccionados.push(cb.value); });
            if (seleccionados.length === 0) {
                document.querySelector('#multi-month-checks input[value="all"]').checked = true;
                this.state.meses = ['all'];
            } else {
                this.state.meses = seleccionados;
            }
        }

        const factorMeses = this.state.meses.includes('all') ? 1 : (this.state.meses.length / 12);
        const columnaResumen = document.querySelector('.column[data-lvl="2"]');
        
        if (columnaResumen) {
            if (this.state.modulo === 'capex') {
                const totalInversion = Object.values(CAPEX_CONFIG).reduce((acc, curr) => acc + curr.montoFijo, 0);
                const totalElement = columnaResumen.querySelector('[style*="font-size: 2.8rem"]');
                if (totalElement) totalElement.textContent = this.formatMoney(totalInversion);
            }
            if (this.state.modulo === 'operacion') {
                const totalOperacion = Object.values(OPEX_CONFIG).reduce((acc, curr) => acc + (curr.montoFijo * factorMeses), 0);
                const totalElement = columnaResumen.querySelector('[style*="font-size: 2.8rem"]');
                if (totalElement) totalElement.textContent = this.formatMoney(totalOperacion);
                columnaResumen.querySelectorAll('[onclick*="seleccionarComponente"]').forEach(item => {
                    const onclickAttr = item.getAttribute('onclick');
                    const match = onclickAttr.match(/'([^']+)'/);
                    if (match && OPEX_CONFIG[match[1]]) {
                        const key = match[1];
                        const montoElement = item.querySelector('div:last-child');
                        if (montoElement) montoElement.textContent = this.formatMoney(OPEX_CONFIG[key].montoFijo * factorMeses);
                    }
                });
            }
            if (this.state.modulo === 'mantenimiento') {
                const conteosMantto = this.dbManager.getConteosConsolidados(this.state.unidad, 'mantenimiento', this.state.meses);
                const preventivoTotal = (conteosMantto.estetico || 0) + (conteosMantto.profundo || 0) + (conteosMantto.software || 0);
                const correctivoTotal = (conteosMantto.tickets || 0) + (conteosMantto.modificacionEstructura || 0);
                const totalTickets = preventivoTotal + correctivoTotal;
                
                const totalElement = columnaResumen.querySelector('[style*="font-size: 2.8rem"]');
                if (totalElement) totalElement.textContent = `${totalTickets} Tickets`;
                
                const subItems = columnaResumen.querySelectorAll('[onclick*="seleccionarComponente"]');
                subItems.forEach(item => {
                    const onclick = item.getAttribute('onclick');
                    const match = onclick.match(/'([^']+)'/);
                    if (match && conteosMantto[match[1]] !== undefined) {
                        const valorEl = item.querySelector('div:last-child');
                        if (valorEl) valorEl.textContent = `${conteosMantto[match[1]] || 0} Registros`;
                    }
                });
                
                const categorias = columnaResumen.querySelectorAll('[style*="font-size:0.85rem; font-weight:600; color:#334155;"]');
                categorias.forEach(cat => {
                    const text = cat.textContent || '';
                    if (text.includes('Preventivo')) {
                        const parentDiv = cat.parentElement;
                        const valorEl = parentDiv.querySelector('[style*="font-size:0.85rem; font-weight:800;"]');
                        if (valorEl) valorEl.textContent = `${preventivoTotal} Tickets`;
                    } else if (text.includes('Correctivo')) {
                        const parentDiv = cat.parentElement;
                        const valorEl = parentDiv.querySelector('[style*="font-size:0.85rem; font-weight:800;"]');
                        if (valorEl) valorEl.textContent = `${correctivoTotal} Tickets`;
                    }
                });
            }
        }

        if (this.state.componente) {
            this._actualizarFichaComponente(this.state.componente);
        }
    }

    async _actualizarFichaComponente(key) {
        key = key || this.state.componente;
        if (!key) return;
        
        const isOpex = !!OPEX_CONFIG[key];
        const isMantto = this.state.modulo === 'mantenimiento';
        const factorMeses = this.state.meses.includes('all') ? 1 : (this.state.meses.length / 12);
        const pantallas = this.dbManager.getPantallasPorUnidad(this.state.unidad);
        
        const componentesDedicados = {
            'nuc': './componentes/ComponenteNUC.js',
            'camara': './componentes/ComponenteCamara.js',
            'costoPantalla': './componentes/ComponentePantalla.js',
            'ups': './componentes/ComponenteUPS.js',
            'novastar': './componentes/ComponenteSendingCard.js',
            'poe': './componentes/ComponentePOE.js',
            'teltonika': './componentes/ComponenteTeltonika.js',
            'pastillaTri': './componentes/ComponenteInterruptorTri.js',
            'pastilla20A': './componentes/ComponenteInterruptor20A.js',
            'costoEstructura': './componentes/ComponenteEstructura.js',
            'costoInstalacion': './componentes/ComponenteInstalacion.js',
            'costoMedidor': './componentes/ComponenteMedidor.js',
            'cfe': './componentes/ComponenteCFE.js',
            'internetFibra': './componentes/ComponenteInternetFibra.js',
            'internetSatelital': './componentes/ComponenteInternetSatelital.js',
            'licTeltonika': './componentes/ComponenteLicenciaTeltonika.js',
            'licTeamViewer': './componentes/ComponenteLicenciaTeamViewer.js',
            'licCMS': './componentes/ComponenteLicenciaCMS.js',
            'licHikvision': './componentes/ComponenteLicenciaHikvision.js',
            'licUPS': './componentes/ComponenteLicenciaUPS.js',
            'licQTM': './componentes/ComponenteLicenciaQTM.js',
            'pauta': './componentes/ComponentePauta.js',
            'gasolina': './componentes/ComponenteGasolina.js',
            'transporte': './componentes/ComponenteTransporte.js',
            'estetico': './componentes/ComponenteManttoEstetico.js',
            'profundo': './componentes/ComponenteManttoProfundo.js',
            'software': './componentes/ComponenteManttoSoftware.js',
            'tickets': './componentes/ComponenteManttoTickets.js',
            'modificacionEstructura': './componentes/ComponenteManttoModificacionEstructura.js'
        };

        if (componentesDedicados[key]) {
            try {
                const modulo = await import(componentesDedicados[key]);
                const ComponenteClass = modulo.default;
                const comp = new ComponenteClass(this);
                const totales = comp.getTotales(pantallas, this.state.meses);
                
                const panelFicha = document.getElementById(`panel-ficha-${key}`);
                if (panelFicha) {
                    const fichaContent = panelFicha.querySelector('div');
                    if (fichaContent) {
                        fichaContent.innerHTML = comp.renderFicha(totales);
                    }
                }
                
                const listaUbicaciones = document.getElementById(`lista-ubicaciones-${key}`);
                if (listaUbicaciones) {
                    let ubicacionesHTML = '';
                    pantallas.forEach(p => {
                        let valorMostrar = '';
                        let costoReal = 0;
                        
                        if (comp && typeof comp.getCostoPorPantalla === 'function') {
                            costoReal = comp.getCostoPorPantalla(p);
                        } else if (comp && typeof comp.getCostoUbicacion === 'function') {
                            costoReal = comp.getCostoUbicacion(p);
                        }
                        
                        if (costoReal <= 0) return;
                        
                        if (comp && typeof comp.getCostoPorPantalla === 'function') {
                            if (key === 'modificacionEstructura') {
                                valorMostrar = `${costoReal} cara(s) con renovacion`;
                            } else if (isMantto) {
                                valorMostrar = this.formatMoney(costoReal);
                            } else {
                                valorMostrar = this.formatMoney(costoReal);
                            }
                        } else if (comp && typeof comp.getCostoUbicacion === 'function') {
                            valorMostrar = isMantto ? costoReal : this.formatMoney(costoReal);
                        } else if (isOpex) {
                            valorMostrar = this.formatMoney((OPEX_CONFIG[key].montoFijo * factorMeses) / 54);
                        } else {
                            valorMostrar = this.formatMoney(CAPEX_CONFIG[key]?.montoFijo || 0);
                        }
                        
                        ubicacionesHTML += `<div class="node ubicacion-item" data-id="${p.id}" data-key="${key}" 
                            style="padding:15px; cursor:pointer; margin-bottom:10px; background:#fff; border:1px solid #e2e8f0; border-radius:10px; transition:0.2s;"
                            onclick="app.mostrarDetalleComponente('${key}','${p.id}')"
                            onmouseover="this.style.borderColor='var(--theme-light)'; this.style.boxShadow='0 2px 5px rgba(0,0,0,0.05)';" 
                            onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div><div style="font-weight:800; font-size:0.95rem; color:#0f172a; margin-bottom:2px;">${p.id}</div>
                                <div style="font-size:0.75rem; color:#64748b;">${p.nombre}</div></div>
                                <div style="font-size:0.9rem; color:var(--theme-color); font-weight:700;">${valorMostrar}</div></div></div>`;
                    });
                    listaUbicaciones.innerHTML = ubicacionesHTML;
                }
            } catch (e) {
                console.error(`Error actualizando componente ${key}:`, e);
            }
        }
    }

    construirNivel1() {
        this.renderer.clearAll();
        const html = `
            <div class="node" onclick="app.seleccionarModulo('capex', this)"><div class="node-title">CAPEX</div></div>
            <div class="node" onclick="app.seleccionarModulo('operacion', this)"><div class="node-title">OPERACION</div><div class="node-sub">Flujo de Gastos</div></div>
            <div class="node" onclick="app.seleccionarModulo('mantenimiento', this)"><div class="node-title">MANTENIMIENTO</div><div class="node-sub">Prevision e Incidencias</div></div>`;
        this.renderer.createColumn(1, "MODULOS", html);
    }

    seleccionarModulo(modulo, nodeEl) {
        this.state.modulo = modulo;
        this.state.subModulo = '';
        this.state.componente = '';
        this.state.pantalla = '';
        this.renderer.deselectNodes(1); 
        nodeEl.classList.add('selected'); 
        this.renderer.removeColumnsAfter(1);
        nodeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        
        if (modulo === 'mantenimiento') {
            const conteosMantto = this.dbManager.getConteosConsolidados(this.state.unidad, 'mantenimiento', this.state.meses);
            const preventivoTotal = (conteosMantto.estetico || 0) + (conteosMantto.profundo || 0) + (conteosMantto.software || 0);
            const correctivoTotal = (conteosMantto.tickets || 0) + (conteosMantto.modificacionEstructura || 0);
            const totalTickets = preventivoTotal + correctivoTotal;
            
            const subPreventivoHTML = `
                <div onclick="app.seleccionarComponente('estetico', this)" 
                    style="display:flex; justify-content:space-between; align-items:center; padding:12px 25px 12px 45px; border-bottom:1px solid #f1f5f9; cursor:pointer; background:#fafbfc;"
                    onmouseover="this.style.background='#f0f4f8'; this.style.paddingLeft='52px';" 
                    onmouseout="this.style.background='#fafbfc'; this.style.paddingLeft='45px';">
                    <div style="font-size:0.8rem; font-weight:500; color:#64748b;">Estetico</div>
                    <div style="font-size:0.8rem; font-weight:700; color:var(--theme-color);">${conteosMantto.estetico || 0} Registros</div>
                </div>
                <div onclick="app.seleccionarComponente('profundo', this)" 
                    style="display:flex; justify-content:space-between; align-items:center; padding:12px 25px 12px 45px; border-bottom:1px solid #f1f5f9; cursor:pointer; background:#fafbfc;"
                    onmouseover="this.style.background='#f0f4f8'; this.style.paddingLeft='52px';" 
                    onmouseout="this.style.background='#fafbfc'; this.style.paddingLeft='45px';">
                    <div style="font-size:0.8rem; font-weight:500; color:#64748b;">Profundo</div>
                    <div style="font-size:0.8rem; font-weight:700; color:var(--theme-color);">${conteosMantto.profundo || 0} Registros</div>
                </div>
                <div onclick="app.seleccionarComponente('software', this)" 
                    style="display:flex; justify-content:space-between; align-items:center; padding:12px 25px 12px 45px; cursor:pointer; background:#fafbfc;"
                    onmouseover="this.style.background='#f0f4f8'; this.style.paddingLeft='52px';" 
                    onmouseout="this.style.background='#fafbfc'; this.style.paddingLeft='45px';">
                    <div style="font-size:0.8rem; font-weight:500; color:#64748b;">Software</div>
                    <div style="font-size:0.8rem; font-weight:700; color:var(--theme-color);">${conteosMantto.software || 0} Registros</div>
                </div>`;
            
            const subCorrectivoHTML = `
                <div onclick="app.seleccionarComponente('tickets', this)" 
                    style="display:flex; justify-content:space-between; align-items:center; padding:12px 25px 12px 45px; border-bottom:1px solid #f1f5f9; cursor:pointer; background:#fafbfc;"
                    onmouseover="this.style.background='#f0f4f8'; this.style.paddingLeft='52px';" 
                    onmouseout="this.style.background='#fafbfc'; this.style.paddingLeft='45px';">
                    <div style="font-size:0.8rem; font-weight:500; color:#64748b;">Incidencias Tickets</div>
                    <div style="font-size:0.8rem; font-weight:700; color:var(--theme-color);">${conteosMantto.tickets || 0} Registros</div>
                </div>
                <div onclick="app.seleccionarComponente('modificacionEstructura', this)" 
                    style="display:flex; justify-content:space-between; align-items:center; padding:12px 25px 12px 45px; cursor:pointer; background:#fafbfc;"
                    onmouseover="this.style.background='#f0f4f8'; this.style.paddingLeft='52px';" 
                    onmouseout="this.style.background='#fafbfc'; this.style.paddingLeft='45px';">
                    <div style="font-size:0.8rem; font-weight:500; color:#64748b;">Modificacion de Estructura</div>
                    <div style="font-size:0.8rem; font-weight:700; color:var(--theme-color);">${conteosMantto.modificacionEstructura || 0} Registros</div>
                </div>`;
            
            const html = `
            <div style="min-width: 550px; background: #fff; height: 100%; display: flex; flex-direction: column;">
                <div style="padding: 40px 30px 30px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 0.7rem; font-weight: 800; color: #94a3b8; letter-spacing: 2px; margin-bottom: 8px;">2. RESUMEN MANTENIMIENTO</div>
                    <div style="font-size: 1.4rem; font-weight: 900; color: #0f172a; margin-bottom: 30px; text-transform: uppercase;">${this.state.unidad}</div>
                    <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">Total de Tickets</div>
                    <div style="font-size: 2.8rem; font-weight: 900; color: var(--theme-color);">${totalTickets} Tickets</div>
                </div>
                <div style="flex: 1; overflow-y: auto; padding: 10px 0;">
                    <div style="border-bottom:1px solid #e2e8f0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 25px; background:#fff;">
                            <div style="font-size:0.85rem; font-weight:600; color:#334155;">Preventivo <span style="margin: 0 8px; color: #cbd5e1;">|</span> <span style="font-weight:700; color:#64748b;">Rutina y Software</span></div>
                            <div style="font-size:0.85rem; font-weight:800; color:var(--theme-color);">${preventivoTotal} Tickets</div>
                        </div>
                        ${subPreventivoHTML}
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 25px; background:#fff;">
                            <div style="font-size:0.85rem; font-weight:600; color:#334155;">Correctivo <span style="margin: 0 8px; color: #cbd5e1;">|</span> <span style="font-weight:700; color:#64748b;">Incidencias y Adecuaciones</span></div>
                            <div style="font-size:0.85rem; font-weight:800; color:var(--theme-color);">${correctivoTotal} Tickets</div>
                        </div>
                        ${subCorrectivoHTML}
                    </div>
                </div>
            </div>`;
            this.renderer.createColumn(2, "RESUMEN MANTENIMIENTO", html);
        } else if (modulo === 'operacion') {
            const factorMeses = this.state.meses.includes('all') ? 1 : (this.state.meses.length / 12);
            const totalOperacion = Object.values(OPEX_CONFIG).reduce((acc, curr) => acc + (curr.montoFijo * factorMeses), 0);
            const cuadrosHTML = Object.keys(OPEX_CONFIG).map(key => {
                const comp = OPEX_CONFIG[key];
                const montoFiltrado = comp.montoFijo * factorMeses;
                return `<div onclick="app.seleccionarComponente('${key}', this)" 
                    style="display:flex; justify-content:space-between; align-items:center; padding:15px 25px; border-bottom:1px solid #f1f5f9; cursor:pointer;"
                    onmouseover="this.style.background='#f8fafc'; this.style.paddingLeft='32px';" 
                    onmouseout="this.style.background='transparent'; this.style.paddingLeft='25px';">
                    <div style="font-size:0.85rem; font-weight:600; color:#334155;">${comp.label}</div>
                    <div style="font-size:0.85rem; font-weight:800; color:var(--theme-color);">${this.formatMoney(montoFiltrado)}</div></div>`;
            }).join('');
            const html = `
            <div style="min-width: 550px; background: #fff; height: 100%; display: flex; flex-direction: column;">
                <div style="padding: 40px 30px 30px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 0.7rem; font-weight: 800; color: #94a3b8; letter-spacing: 2px; margin-bottom: 8px;">2. RESUMEN OPERACION</div>
                    <div style="font-size: 1.4rem; font-weight: 900; color: #0f172a; margin-bottom: 30px; text-transform: uppercase;">${this.state.unidad}</div>
                    <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">Gasto Total OPEX</div>
                    <div style="font-size: 2.8rem; font-weight: 900; color: var(--theme-color);">${this.formatMoney(totalOperacion)}</div></div>
                <div style="flex: 1; overflow-y: auto; padding: 10px 0;">${cuadrosHTML}</div></div>`;
            this.renderer.createColumn(2, "RESUMEN OPERACION", html);
        } else if (modulo === 'capex') {
            const totalInversion = Object.values(CAPEX_CONFIG).reduce((acc, curr) => acc + curr.montoFijo, 0);
            const cuadrosHTML = Object.keys(CAPEX_CONFIG).map(key => {
                const comp = CAPEX_CONFIG[key];
                return `<div onclick="app.seleccionarComponente('${key}', this)" 
                    style="display:flex; justify-content:space-between; align-items:center; padding:15px 25px; border-bottom:1px solid #f1f5f9; cursor:pointer;"
                    onmouseover="this.style.background='#f8fafc'; this.style.paddingLeft='32px';" 
                    onmouseout="this.style.background='transparent'; this.style.paddingLeft='25px';">
                    <div style="font-size:0.85rem; font-weight:600; color:#334155;">${comp.label} <span style="margin: 0 8px; color: #cbd5e1;">|</span> <span style="font-weight:700; color:#64748b;">${comp.cantidad} ubic.</span></div>
                    <div style="font-size:0.85rem; font-weight:800; color:var(--theme-color);">${this.formatMoney(comp.montoFijo)}</div></div>`;
            }).join('');
            const html = `
            <div style="min-width: 550px; background: #fff; height: 100%; display: flex; flex-direction: column;">
                <div style="padding: 40px 30px 30px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 0.7rem; font-weight: 800; color: #94a3b8; letter-spacing: 2px; margin-bottom: 8px;">2. RESUMEN CAPEX</div>
                    <div style="font-size: 1.4rem; font-weight: 900; color: #0f172a; margin-bottom: 30px; text-transform: uppercase;">${this.state.unidad}</div>
                    <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">Inversion Total</div>
                    <div style="font-size: 2.8rem; font-weight: 900; color: var(--theme-color);">${this.formatMoney(totalInversion)}</div></div>
                <div style="flex: 1; overflow-y: auto; padding: 10px 0;">${cuadrosHTML}</div></div>`;
            this.renderer.createColumn(2, "RESUMEN CAPEX", html);
        }
    }

    async seleccionarComponente(key, nodeEl) {
        this.state.componente = key;
        this.state.pantalla = '';
        this.state.filtroActivo = null;
        const lvl = parseInt(nodeEl.closest('.column').dataset.lvl);
        this.renderer.deselectNodes(lvl); 
        nodeEl.classList.add('selected'); 
        this.renderer.removeColumnsAfter(lvl); 
        await this.generarFichaDinamicaNativa(key, lvl);
    }

    async generarFichaDinamicaNativa(key, lvl) {
        const isOpex = !!OPEX_CONFIG[key];
        const isMantto = this.state.modulo === 'mantenimiento';
        const factorMeses = this.state.meses.includes('all') ? 1 : (this.state.meses.length / 12);
        const conf = isOpex ? OPEX_CONFIG[key] : (CAPEX_CONFIG[key] || { label: key, montoFijo: 0 });
        const pantallas = this.dbManager.getPantallasPorUnidad(this.state.unidad);
        let fichaHTML = '';
        let ubicacionesHTML = '';

        const componentesDedicados = {
            'nuc': './componentes/ComponenteNUC.js',
            'camara': './componentes/ComponenteCamara.js',
            'costoPantalla': './componentes/ComponentePantalla.js',
            'ups': './componentes/ComponenteUPS.js',
            'novastar': './componentes/ComponenteSendingCard.js',
            'poe': './componentes/ComponentePOE.js',
            'teltonika': './componentes/ComponenteTeltonika.js',
            'pastillaTri': './componentes/ComponenteInterruptorTri.js',
            'pastilla20A': './componentes/ComponenteInterruptor20A.js',
            'costoEstructura': './componentes/ComponenteEstructura.js',
            'costoInstalacion': './componentes/ComponenteInstalacion.js',
            'costoMedidor': './componentes/ComponenteMedidor.js',
            'cfe': './componentes/ComponenteCFE.js',
            'internetFibra': './componentes/ComponenteInternetFibra.js',
            'internetSatelital': './componentes/ComponenteInternetSatelital.js',
            'licTeltonika': './componentes/ComponenteLicenciaTeltonika.js',
            'licTeamViewer': './componentes/ComponenteLicenciaTeamViewer.js',
            'licCMS': './componentes/ComponenteLicenciaCMS.js',
            'licHikvision': './componentes/ComponenteLicenciaHikvision.js',
            'licUPS': './componentes/ComponenteLicenciaUPS.js',
            'licQTM': './componentes/ComponenteLicenciaQTM.js',
            'pauta': './componentes/ComponentePauta.js',
            'gasolina': './componentes/ComponenteGasolina.js',
            'transporte': './componentes/ComponenteTransporte.js',
            'estetico': './componentes/ComponenteManttoEstetico.js',
            'profundo': './componentes/ComponenteManttoProfundo.js',
            'software': './componentes/ComponenteManttoSoftware.js',
            'tickets': './componentes/ComponenteManttoTickets.js',
            'modificacionEstructura': './componentes/ComponenteManttoModificacionEstructura.js'
        };

        let comp = null;

        if (componentesDedicados[key]) {
            try {
                const modulo = await import(componentesDedicados[key]);
                const ComponenteClass = modulo.default;
                comp = new ComponenteClass(this);
                
                const totales = comp.getTotales(pantallas, this.state.meses);
                fichaHTML = comp.renderFicha(totales);
                
                pantallas.forEach(p => {
                    let valorMostrar = '';
                    let costoReal = 0;
                    
                    if (comp && typeof comp.getCostoPorPantalla === 'function') {
                        costoReal = comp.getCostoPorPantalla(p);
                    } else if (comp && typeof comp.getCostoUbicacion === 'function') {
                        costoReal = comp.getCostoUbicacion(p);
                    }
                    
                    if (costoReal <= 0) return;
                    
                    if (comp && typeof comp.getCostoPorPantalla === 'function') {
                        if (key === 'modificacionEstructura') {
                            valorMostrar = `${costoReal} cara(s) con renovacion`;
                        } else if (isMantto) {
                            valorMostrar = this.formatMoney(costoReal);
                        } else {
                            valorMostrar = this.formatMoney(costoReal);
                        }
                    } 
                    else if (comp && typeof comp.getCostoUbicacion === 'function') {
                        const costo = comp.getCostoUbicacion(p);
                        valorMostrar = isMantto ? costo : this.formatMoney(costo);
                    } 
                    else if (isOpex) {
                        valorMostrar = this.formatMoney((conf.montoFijo * factorMeses) / 54);
                    } else {
                        valorMostrar = this.formatMoney(conf.montoFijo || 0);
                    }
                    
                    ubicacionesHTML += `<div class="node ubicacion-item" data-id="${p.id}" data-key="${key}" 
                        style="padding:15px; cursor:pointer; margin-bottom:10px; background:#fff; border:1px solid #e2e8f0; border-radius:10px; transition:0.2s;"
                        onclick="app.mostrarDetalleComponente('${key}','${p.id}')"
                        onmouseover="this.style.borderColor='var(--theme-light)'; this.style.boxShadow='0 2px 5px rgba(0,0,0,0.05)';" 
                        onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div><div style="font-weight:800; font-size:0.95rem; color:#0f172a; margin-bottom:2px;">${p.id}</div>
                            <div style="font-size:0.75rem; color:#64748b;">${p.nombre}</div></div>
                            <div style="font-size:0.9rem; color:var(--theme-color); font-weight:700;">${valorMostrar}</div></div></div>`;
                });
            } catch (e) {
                console.error(`Error cargando componente ${key}:`, e);
                fichaHTML = `<div style="text-align:center; color:#ef4444; padding:20px;">Error: ${e.message}</div>`;
                pantallas.forEach(p => {
                    ubicacionesHTML += `<div class="node ubicacion-item" data-id="${p.id}" data-key="${key}" 
                        style="padding:15px; cursor:pointer; margin-bottom:10px; background:#fff; border:1px solid #e2e8f0; border-radius:10px;"
                        onclick="app.mostrarDetalleComponente('${key}','${p.id}')">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div><div style="font-weight:800; font-size:0.95rem; color:#0f172a;">${p.id}</div>
                            <div style="font-size:0.75rem; color:#64748b;">${p.nombre}</div></div>
                            <div style="font-size:0.9rem; color:var(--theme-color);">---</div></div></div>`;
                });
            }
        }

        const tituloColumna = isMantto 
            ? `${lvl + 1}. ${key.toUpperCase()}` 
            : `${lvl + 1}. ${conf.label ? conf.label.toUpperCase() : key.toUpperCase()}`;

        const html = `
            <div style="padding:15px; background:var(--theme-color); color:#fff; text-align:center; font-weight:800; cursor:pointer; border-radius:8px 8px 0 0; min-width:900px; letter-spacing:1px; text-transform:uppercase;" onclick="app.cerrarPanel(${lvl+1})">REGRESAR</div>
            <div id="panels-container-${key}" style="display:flex; width: 100%; height:75vh; overflow-x:auto; overflow-y:hidden; scroll-behavior: smooth; background:#f8fafc;">
                <div id="panel-ficha-${key}" style="flex: 0 0 380px; display:flex; flex-direction:column; background:#f8fafc; border-right:1px solid #e2e8f0;"><div style="padding:25px; overflow-y:auto; height:100%;">${fichaHTML}</div></div>
                <div id="panel-empty-${key}" style="flex: 1; min-width:400px; display:flex; flex-direction:column; justify-content:center; align-items:center; background:#fff; color:#94a3b8;"><div style="font-size:3.5rem; margin-bottom:15px;">[ x ]</div><div style="font-size:1.1rem; font-weight:700;">Seleccione una agrupacion</div></div>
                <div id="panel-desglose-${key}" style="flex: 0 0 400px; display:none; flex-direction:column; border-right:1px solid #e2e8f0; background:#fff;"><div style="padding:20px; background:#fff; border-bottom:1px solid #e2e8f0; font-weight: 800; color: #0f172a; font-size: 0.95rem;" id="titulo-desglose-${key}">Seleccion</div><div id="resumen-desglose-${key}" style="padding:20px; overflow-y:auto; flex:1;"></div></div>
                <div id="panel-lista-${key}" style="flex: 0 0 350px; display:none; flex-direction:column; border-right:1px solid #e2e8f0; background:#f8fafc;">
                    <div style="padding:15px;">
                        <input type="text" id="buscador-ubicaciones-${key}" placeholder="Buscar por ID o nombre..." style="width:100%; padding:12px 15px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:600; outline:none; margin-bottom:10px;" oninput="app.filtrarUbicaciones('${key}', this.value)">
                    </div>
                    <div style="flex:1; overflow-y:auto; padding:15px;" id="lista-ubicaciones-${key}">${ubicacionesHTML}</div></div>
                <div id="panel-detalle-${key}" style="flex: 0 0 500px; display:none; flex-direction:column; background:#fff; padding:25px; overflow-y:auto;"></div></div>`;
        
        this.renderer.createColumn(lvl + 1, tituloColumna, html);
        setTimeout(() => {
            const col = document.querySelector(`.column[data-lvl="${lvl+1}"]`);
            if(col) col.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            const container = document.getElementById(`panels-container-${key}`);
            if (container) container.scrollTo({ left: 0, behavior: 'instant' });
        }, 100);
    }

    filtrarPorAtributo(componenteKey, atributo, valor, elementoDOM) {
        const isAlreadyActive = elementoDOM.classList.contains('active-filter');
        const panelDesglose = document.getElementById(`panel-desglose-${componenteKey}`);
        const panelLista = document.getElementById(`panel-lista-${componenteKey}`);
        const panelDetalle = document.getElementById(`panel-detalle-${componenteKey}`);
        const panelEmpty = document.getElementById(`panel-empty-${componenteKey}`);
        const panelFicha = document.getElementById(`panel-ficha-${componenteKey}`);
        const resumenDesglose = document.getElementById(`resumen-desglose-${componenteKey}`);
        const tituloDesglose = document.getElementById(`titulo-desglose-${componenteKey}`);
        const lista = document.getElementById(`lista-ubicaciones-${componenteKey}`);
        
        if (panelFicha) {
            panelFicha.querySelectorAll('.ficha-filter-row').forEach(el => { el.classList.remove('active-filter'); el.style.background = 'transparent'; el.style.paddingLeft = '12px'; el.style.borderLeft = 'none'; });
            panelFicha.querySelectorAll('.ficha-filter-card').forEach(el => { el.classList.remove('active-filter'); el.style.background = '#fff'; el.style.borderColor = '#e2e8f0'; });
        }
        if (isAlreadyActive) {
            this.state.filtroActivo = null;
            if(panelDesglose) panelDesglose.style.display = 'none';
            if(panelLista) panelLista.style.display = 'none';
            if(panelDetalle) panelDetalle.style.display = 'none';
            if(panelEmpty) panelEmpty.style.display = 'flex';
            if(panelFicha) this.centrarPanel(panelFicha, componenteKey);
            return;
        }
        this.state.filtroActivo = { componenteKey, atributo, valor, DOM: elementoDOM };
        elementoDOM.classList.add('active-filter');
        if (elementoDOM.classList.contains('ficha-filter-row')) { elementoDOM.style.background = '#f8fafc'; elementoDOM.style.paddingLeft = '18px'; elementoDOM.style.borderLeft = '4px solid var(--theme-color)'; }
        else if (elementoDOM.classList.contains('ficha-filter-card')) { elementoDOM.style.background = '#f0fdf4'; elementoDOM.style.borderColor = '#10b981'; }
        if(panelEmpty) panelEmpty.style.display = 'none';
        
        if (lista) {
            const items = lista.querySelectorAll('.ubicacion-item');
            let totalEncontrados = 0;
            items.forEach(item => {
                const id = item.dataset.id;
                const p = this.dbManager.rawData.find(x => x.id === id);
                let show = false;

                if (!p) {
                    item.style.display = 'none';
                    return;
                }
                
                if (atributo === 'global') {
                    if (valor === 'todas') show = true;
                    else if (valor === 'renovaciones') {
                        if (componenteKey === 'costoEstructura') {
                            Object.keys(p.datosTecnicos || {}).forEach(caraKey => {
                                const modCosto = p.carasVV && p.carasVV[caraKey] ? (Number(p.carasVV[caraKey].modificacionEstructura) || Number(p.carasVV[caraKey].costoModEstructura) || 0) : 0;
                                if (modCosto > 0) show = true;
                            });
                        } else {
                            if (p && p.datosTecnicos) { Object.values(p.datosTecnicos).forEach(cara => { if (cara.fechaRenovacion && String(cara.fechaRenovacion).trim() && String(cara.fechaRenovacion).toLowerCase() !== 'n/a') show = true; }); }
                        }
                    } else if (valor === 'sinRenovar') {
                        let tieneRenovacion = false;
                        if (componenteKey === 'costoEstructura') {
                            Object.keys(p.datosTecnicos || {}).forEach(caraKey => {
                                const modCosto = p.carasVV && p.carasVV[caraKey] ? (Number(p.carasVV[caraKey].modificacionEstructura) || Number(p.carasVV[caraKey].costoModEstructura) || 0) : 0;
                                if (modCosto > 0) tieneRenovacion = true;
                            });
                        } else {
                            if (p && p.datosTecnicos) { Object.values(p.datosTecnicos).forEach(cara => { if (cara.fechaRenovacion && String(cara.fechaRenovacion).trim() && String(cara.fechaRenovacion).toLowerCase() !== 'n/a') tieneRenovacion = true; }); }
                        }
                        show = !tieneRenovacion;
                    }
                } else if (atributo === 'pitch') {
                    if (p && p.datosTecnicos) {
                        Object.values(p.datosTecnicos).forEach(cara => {
                            const pitchRaw = cara.pitch || '';
                            const pitchNormalizado = String(pitchRaw).replace(/\s+/g, '').toUpperCase();
                            if (pitchNormalizado === String(valor).replace(/\s+/g, '').toUpperCase()) show = true;
                        });
                    }
                } else if (atributo === 'marcaPantalla') {
                    if (p && p.datosTecnicos) {
                        Object.values(p.datosTecnicos).forEach(cara => {
                            const marca = cara.marcaPantalla || cara.marca || '';
                            if (marca === String(valor)) show = true;
                        });
                    }
                } else if (atributo === 'medidaM2') {
                    if (p && p.datosTecnicos) {
                        Object.values(p.datosTecnicos).forEach(cara => {
                            const medida = String(cara.medidaM2 || '');
                            if (medida === String(valor)) show = true;
                        });
                    }
                } else if (atributo === 'estadoPantalla') {
                    if (p && p.datosTecnicos) {
                        Object.values(p.datosTecnicos).forEach(cara => {
                            const estado = String(cara.estadoPantalla || '').toLowerCase();
                            if (estado.includes(String(valor).toLowerCase())) show = true;
                        });
                    }
                } else if (atributo === 'fechaInstalacionPantalla') {
                    if (p && p.datosTecnicos) {
                        Object.values(p.datosTecnicos).forEach(cara => {
                            const fechaInst = cara.fechaInstalacionPantalla || cara.fechaInstalacion || '';
                            const ff = this.formatearFechaCorta(fechaInst);
                            if (ff && ff.clave === String(valor).trim()) {
                                show = true;
                            }
                        });
                    }
                } else if (atributo === 'fechaRenovacionGrupo') {
                    if (componenteKey === 'costoEstructura') {
                        Object.keys(p.datosTecnicos || {}).forEach(caraKey => {
                            const modCosto = p.carasVV && p.carasVV[caraKey] ? (Number(p.carasVV[caraKey].modificacionEstructura) || Number(p.carasVV[caraKey].costoModEstructura) || 0) : 0;
                            if (modCosto > 0) {
                                const caraCapex = p.carasVV ? p.carasVV[caraKey] : {};
                                const fechaRen = caraCapex.fechaRenovacionTecnologicaPantalla || (p.datosTecnicos[caraKey] ? p.datosTecnicos[caraKey].fechaRenovacion : '');
                                const ff = this.formatearFechaCorta(fechaRen);
                                if (ff && ff.clave === String(valor).trim()) {
                                    show = true;
                                }
                            }
                        });
                    } else if (p && p.datosTecnicos) {
                        Object.values(p.datosTecnicos).forEach(cara => {
                            const fechaRen = cara.fechaRenovacion || '';
                            const ff = this.formatearFechaCorta(fechaRen);
                            if (ff && ff.clave === String(valor).trim()) {
                                show = true;
                            }
                        });
                    }
                } else if (p && p.datosTecnicos) {
                    Object.values(p.datosTecnicos).forEach(cara => {
                        const caraValor = String(cara[atributo] || 'N/D');
                        if (atributo === 'nucEstado' || atributo === 'camaraEstado' || atributo === 'upsEstado' || atributo === 'sd300Estado' || atributo === 'poeEstado' || atributo === 'redundanciaEstado' || atributo === 'estadoPantalla') {
                            if (caraValor.toLowerCase() === String(valor).toLowerCase()) show = true;
                        } else {
                            if (caraValor === String(valor)) show = true;
                        }
                    });
                }
                
                if (show) totalEncontrados++;
                item.style.display = show ? '' : 'none';
            });
            
            if (tituloDesglose) tituloDesglose.innerHTML = `${atributo === 'fechaInstalacionPantalla' ? 'Instalacion' : atributo === 'fechaRenovacionGrupo' ? 'Modificacion' : atributo}: <b>${valor}</b> (${totalEncontrados})`;
            
            if (panelLista) { panelLista.style.display = 'flex'; this.centrarPanel(panelLista, componenteKey); }
            if (panelDetalle) panelDetalle.style.display = 'none';
            if (panelDesglose) panelDesglose.style.display = 'none';
        }
    }

    mostrarUbicacionesFinales(componenteKey, attr1, val1, attr2, val2, elementoDOM) {
        const panelLista = document.getElementById(`panel-lista-${componenteKey}`);
        const panelDetalle = document.getElementById(`panel-detalle-${componenteKey}`);
        const lista = document.getElementById(`lista-ubicaciones-${componenteKey}`);
        if (!lista) return;
        const items = lista.querySelectorAll('.ubicacion-item');
        items.forEach(item => {
            const id = item.dataset.id; const p = this.dbManager.rawData.find(x => x.id === id); let show = false;
            if (p && p.datosTecnicos) { Object.values(p.datosTecnicos).forEach(cara => { let match1 = false; if (attr1 === 'global') { if (val1 === 'todas') match1 = true; else if (val1 === 'renovaciones' && cara.fechaRenovacion && String(cara.fechaRenovacion).trim() !== '') match1 = true; } else { if (String(cara[attr1] || 'N/D') === String(val1)) match1 = true; } let match2 = true; if (attr2 && attr2 !== 'null') { if (String(cara[attr2] || 'N/D') !== String(val2)) match2 = false; } if (match1 && match2) show = true; }); }
            item.style.display = show ? '' : 'none';
        });
        if (panelLista) panelLista.style.display = 'flex';
        if (panelDetalle) panelDetalle.style.display = 'none';
        if (panelLista) this.centrarPanel(panelLista, componenteKey);
    }

    async mostrarDetalleComponente(key, idPantalla) {
        const p = this.dbManager.rawData.find(x => x.id === idPantalla);
        if (!p) return;
        const panelDetalle = document.getElementById(`panel-detalle-${key}`);
        if (!panelDetalle) return;
        const lista = document.getElementById(`lista-ubicaciones-${key}`);
        if (lista) {
            lista.querySelectorAll('.ubicacion-item').forEach(item => {
                item.style.background = '#fff';
                item.style.border = '1px solid #e2e8f0';
            });
            const selected = lista.querySelector(`[data-id="${idPantalla}"]`);
            if (selected) {
                selected.style.background = '#f0fdf4';
                selected.style.border = '1px solid #10b981';
            }
        }

        const componentesDedicadosDetalle = {
            'costoPantalla': './componentes/ComponentePantalla.js',
            'costoEstructura': './componentes/ComponenteEstructura.js',
            'costoMedidor': './componentes/ComponenteMedidor.js',
            'costoInstalacion': './componentes/ComponenteInstalacion.js',
            'novastar': './componentes/ComponenteSendingCard.js',
            'ups': './componentes/ComponenteUPS.js',
            'nuc': './componentes/ComponenteNUC.js',
            'camara': './componentes/ComponenteCamara.js',
            'teltonika': './componentes/ComponenteTeltonika.js',
            'poe': './componentes/ComponentePOE.js',
            'pastillaTri': './componentes/ComponenteInterruptorTri.js',
            'pastilla20A': './componentes/ComponenteInterruptor20A.js',
            'pauta': './componentes/ComponentePauta.js',
            'gasolina': './componentes/ComponenteGasolina.js',
            'transporte': './componentes/ComponenteTransporte.js',
            'cfe': './componentes/ComponenteCFE.js',
            'internetFibra': './componentes/ComponenteInternetFibra.js',
            'internetSatelital': './componentes/ComponenteInternetSatelital.js',
            'licTeltonika': './componentes/ComponenteLicenciaTeltonika.js',
            'licTeamViewer': './componentes/ComponenteLicenciaTeamViewer.js',
            'licCMS': './componentes/ComponenteLicenciaCMS.js',
            'licHikvision': './componentes/ComponenteLicenciaHikvision.js',
            'licUPS': './componentes/ComponenteLicenciaUPS.js',
            'licQTM': './componentes/ComponenteLicenciaQTM.js',
            'estetico': './componentes/ComponenteManttoEstetico.js',
            'profundo': './componentes/ComponenteManttoProfundo.js',
            'software': './componentes/ComponenteManttoSoftware.js',
            'tickets': './componentes/ComponenteManttoTickets.js',
            'modificacionEstructura': './componentes/ComponenteManttoModificacionEstructura.js'
        };

        let detalleHTML = '';

        if (componentesDedicadosDetalle[key]) {
            try {
                const modulo = await import(componentesDedicadosDetalle[key]);
                const CompClass = modulo.default;
                const comp = new CompClass(this);
                detalleHTML = comp.renderDetalleUbicacion(p);
            } catch (e) {
                console.error(`Error cargando detalle para ${key}:`, e);
                detalleHTML = `<div style="text-align:center; color:#ef4444; padding:20px;">Error: ${e.message}</div>`;
            }
        } else {
            const isOpex = !!OPEX_CONFIG[key];
            const factorMeses = this.state.meses.includes('all') ? 1 : (this.state.meses.length / 12);
            
            if (isOpex) {
                const conf = OPEX_CONFIG[key];
                const costoProrrateado = (conf.montoFijo * factorMeses) / 54;
                detalleHTML = `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:15px; margin-bottom:15px;">
                        <div style="font-weight:800; color:#0f172a; margin-bottom:10px;">${conf.label}</div>
                        <div style="font-size:1.5rem; font-weight:900; color:var(--theme-color); text-align:right;">${this.formatMoney(costoProrrateado)}</div>
                    </div>`;
            } else {
                let costo = 0;
                if (p.carasVV) {
                    Object.values(p.carasVV).forEach(cara => costo += (Number(cara[key]) || 0));
                } else {
                    costo = Number(p.capex[key]) || 0;
                }
                detalleHTML = `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:15px;">
                        <div style="font-weight:800;">${key}</div>
                        <div style="font-size:1.5rem; font-weight:900; color:var(--theme-color); text-align:right;">${this.formatMoney(costo)}</div>
                    </div>`;
            }
        }

        panelDetalle.innerHTML = `
            <div style="margin-bottom:15px; border-bottom:1px solid #e2e8f0; padding-bottom:15px;">
                <div style="font-size:0.7rem; color:#64748b; font-weight:800; text-transform:uppercase;">UBICACION SELECCIONADA</div>
                <div style="font-size:1.3rem; font-weight:900; color:#0f172a; margin-bottom:2px;">${p.id}</div>
                <div style="font-size:0.85rem; color:#475569; margin-bottom:12px;">${p.nombre}</div>
            </div>
            ${detalleHTML}
            <button onclick="app.abrirModalRadiografia('${key}', '${p.id}')" style="width:100%; padding:14px; background:#0f172a; color:#fff; border:none; border-radius:10px; font-weight:800; font-size:0.85rem; cursor:pointer; text-transform:uppercase; letter-spacing:1px; margin-top:20px;">Radiografia de la Ubicacion</button>`;
        panelDetalle.style.display = 'flex';
        this.centrarPanel(panelDetalle, key);
    }

    calcularCostoUbicacion(p, key) {
        let valor = 0; const isOpex = !!OPEX_CONFIG[key];
        const factorMeses = this.state.meses.includes('all') ? 1 : (this.state.meses.length / 12);
        if (isOpex) { valor = (OPEX_CONFIG[key].montoFijo * factorMeses) / 54; }
        else { if (p.carasVV) { Object.values(p.carasVV).forEach(cara => { valor += (Number(cara[key]) || 0); }); } else { valor = Number(p.capex[key]) || 0; } }
        return valor;
    }

    filtrarUbicaciones(key, query) {
        const lista = document.getElementById(`lista-ubicaciones-${key}`);
        if (!lista) return;
        const items = lista.querySelectorAll('.ubicacion-item'); const q = query.toLowerCase().trim();
        items.forEach(item => { const id = (item.dataset.id || '').toLowerCase(); const nombre = (item.querySelector('.node-sub')?.textContent || '').toLowerCase(); item.style.display = (q === '' || id.includes(q) || nombre.includes(q)) ? '' : 'none'; });
    }

    renderExpedienteCompleto(p) {
        let capexHTML = ''; let capexTotal = 0;
        const factorMeses = this.state.meses.includes('all') ? 1 : (this.state.meses.length / 12);
        const diccCapex = { costoPantalla: 'Pantalla', costoEstructura: 'Estructura', costoMedidor: 'Medidor CFE', costoInstalacion: 'Instalacion electrica', novastar: 'Sending card', ups: 'UPS', nuc: 'NUC', pastillaTri: 'Interruptor termomagnetico trifasica 3x100 amp', pastilla20A: 'Interruptor termomagnetico 2x20 amp', camara: 'Camara', teltonika: 'Teltonika rut 955', poe: 'Poe utepo' };
        const getLabel = (k) => typeof diccCapex[k] === 'object' ? diccCapex[k].label : (diccCapex[k] || k);
        if (p.carasVV) {
            Object.keys(p.carasVV).forEach(cara => {
                capexHTML += `<div style="font-weight:900; font-size:0.75rem; color:#64748b; margin-top:12px; margin-bottom:6px; text-transform:uppercase;">CARA ${cara}</div>`;
                Object.keys(diccCapex).forEach(k => { const val = Number(p.carasVV[cara][k]) || 0; if (val > 0) { capexHTML += `<div style="display:flex; justify-content:space-between; font-size:0.8rem; padding:4px 0; border-bottom:1px dashed #e2e8f0;"><span style="color:#475569;">${getLabel(k)}</span><span style="font-weight:700; color:#0f172a;">${this.formatMoney(val)}</span></div>`; capexTotal += val; } });
            });
        }
        let opexHTML = ''; let opexTotal = 0;
        Object.keys(OPEX_CONFIG).forEach(k => { 
            const conf = OPEX_CONFIG[k]; 
            const montoProrrateadoUnidad = (conf.montoFijo * factorMeses) / 54;
            opexHTML += `<div style="display:flex; justify-content:space-between; font-size:0.8rem; padding:4px 0; border-bottom:1px dashed #e2e8f0;"><span style="color:#475569;">${conf.label}</span><span style="font-weight:700; color:#0f172a;">${this.formatMoney(montoProrrateadoUnidad)}</span></div>`; 
            opexTotal += montoProrrateadoUnidad; 
        });
        let manttoHTML = ''; let manttoTotal = 0;
        const tks = (p.tickets || []).filter(tk => this.state.meses.includes('all') || this.state.meses.includes(tk.mes));
        tks.forEach(tk => { const val = Number(tk.costoManttoOriginal) || 0; if(val > 0) { manttoTotal += val; manttoHTML += `<div style="margin-bottom:12px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #f1f5f9;"><div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:800; color:#0f172a; margin-bottom:4px;"><span>${tk.actividad}</span><span style="color:var(--theme-color);">${this.formatMoney(val)}</span></div><div style="font-size:0.75rem; color:#64748b; line-height:1.4;"><div><b>Causa:</b> ${tk.causa || 'N/D'}</div><div><b>Insumo:</b> ${tk.insumo || 'Ninguno'}</div><div><b>Refaccion:</b> ${tk.refaccion || 'Ninguna'}</div></div><div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">${tk.fechaCorta || ''} (${tk.mes || 'all'})</div></div>`; } });
        return `
            <div style="margin-bottom: 25px;"><div style="font-size:0.95rem; font-weight:900; color:var(--theme-color); margin-bottom:12px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">1. INVERSION INICIAL (CAPEX)</div>${capexHTML || '<div style="font-size:0.8rem; color:#94a3b8; text-align:center; padding:10px;">Sin registros</div>'}<div style="text-align:right; font-weight:900; font-size:1rem; color:#0f172a; margin-top:12px; padding-top:10px; border-top:1px solid #e2e8f0;">Subtotal CAPEX: ${this.formatMoney(capexTotal)}</div></div>
            <div style="margin-bottom: 25px;"><div style="font-size:0.95rem; font-weight:900; color:var(--theme-color); margin-bottom:12px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">2. GASTOS DE OPERACION</div>${opexHTML || '<div style="font-size:0.8rem; color:#94a3b8; text-align:center; padding:10px;">Sin registros</div>'}<div style="text-align:right; font-weight:900; font-size:1rem; color:#0f172a; margin-top:12px; padding-top:10px; border-top:1px solid #e2e8f0;">Subtotal OPEX: ${this.formatMoney(opexTotal)}</div></div>
            <div style="margin-bottom: 25px;"><div style="font-size:0.95rem; font-weight:900; color:var(--theme-color); margin-bottom:12px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">3. MANTENIMIENTO E INCIDENCIAS</div>${manttoHTML || '<div style="font-size:0.8rem; color:#94a3b8; text-align:center; padding:10px;">Sin registros</div>'}<div style="text-align:right; font-weight:900; font-size:1rem; color:#0f172a; margin-top:12px; padding-top:10px; border-top:1px solid #e2e8f0;">Subtotal MANTTO: ${this.formatMoney(manttoTotal)}</div></div>`;
    }

    async abrirModalRadiografia(key, idPantalla) {
        const p = this.dbManager.rawData.find(x => x.id === idPantalla);
        if (!p) return;
        const modal = document.getElementById('modal-radiografia');
        if (!modal) { this.modalCtrl.renderExpedienteCompleto(p, this.dbManager.diccionarios, this.state.meses); return; }
        modal.querySelector('.modal-box').style.width = '1300px';
        modal.querySelector('.modal-box').style.maxWidth = '98vw';
        modal.querySelector('.modal-box').style.padding = '0';
        modal.querySelector('.modal-box').style.maxHeight = '90vh';
        modal.querySelector('.modal-box').style.overflowY = 'auto';
        document.getElementById('rad-titulo').style.display = 'none';
        document.getElementById('rad-subtitulo').style.display = 'none';
        let nombreComponente = key;
        const dicc = this.dbManager.diccionarios.capex || {};
        if (dicc[key]) nombreComponente = typeof dicc[key] === 'object' ? dicc[key].label : dicc[key];
        else if (OPEX_CONFIG[key]) nombreComponente = OPEX_CONFIG[key].label;
        let detalleHTML = this.renderExpedienteCompleto(p);
        const costoComponente = this.calcularCostoUbicacion(p, key);
        document.getElementById('rad-contenido').innerHTML = `
            <div style="display: flex; min-height: 75vh;">
                <div style="flex: 1; border-right: 1px solid #e2e8f0; background: #f8fafc; display: flex; flex-direction: column; min-width: 400px;">
                    <div style="padding: 20px 25px; background: #fff; border-bottom: 1px solid #e2e8f0;">
                        <div style="font-size:0.75rem; color:#64748b; font-weight:800; text-transform:uppercase; margin-bottom:4px;">UBICACION PRINCIPAL</div>
                        <div style="font-size:1.3rem; font-weight:900; color:#0f172a; margin-bottom:2px;">${p.id}</div>
                        <div style="font-size:0.85rem; color:#475569; margin-bottom:8px;">${p.nombre}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                            <div style="font-size:0.7rem; color:#94a3b8; font-family:monospace; background:#f1f5f9; padding:4px 8px; border-radius:4px;">Lat: ${p.lat.toFixed(4)} | Lng: ${p.lng.toFixed(4)}</div>
                            <a href="https://www.google.com/maps?q=${p.lat},${p.lng}" target="_blank" style="font-size:0.65rem; color:var(--theme-color); font-weight:700; text-decoration:none; background:#eff6ff; padding:4px 8px; border-radius:4px;">Google Maps</a></div>
                        <div style="margin-top:8px; background:#f0fdf4; padding:8px 12px; border-radius:6px; border:1px solid #bbf7d0;"><div style="font-size:0.6rem; color:#166534; font-weight:700;">${nombreComponente.toUpperCase()}</div><div style="font-size:1.1rem; font-weight:900; color:#15803d;">${this.formatMoney(costoComponente)}</div></div></div>
                    <div style="flex: 1; overflow-y: auto; padding: 15px 25px;">
                        <div style="display:flex; gap:12px; margin-bottom:15px;"><div id="mapa-rad-orig-${p.id}" style="flex:1; height:160px; border-radius:10px; border:1px solid #e2e8f0; overflow:hidden; background:#e2e8f0;"></div><div style="flex:1; height:160px; background:#e2e8f0; border-radius:10px; overflow:hidden; display:flex; align-items:center; justify-content:center; position:relative; border:1px solid #e2e8f0;"><span id="sinfoto-orig-${p.id}" style="position:absolute; font-size:0.65rem; color:#64748b; font-weight:800; z-index:1;">SIN FOTO</span><img src="assets/fotos/${p.id}.jpg" onerror="document.getElementById('sinfoto-orig-${p.id}').style.display='block';" onload="this.style.display='block'; document.getElementById('sinfoto-orig-${p.id}').style.display='none';" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:2; display:none;"></div></div>
                        <div style="border-top:2px solid #e2e8f0; padding-top:15px;"><div style="font-size:0.8rem; font-weight:900; color:#6366f1; text-transform:uppercase; margin-bottom:10px;">EXPEDIENTE COMPLETO</div>${detalleHTML}</div></div></div>
                <div style="flex: 1; display: flex; flex-direction: column; background: #fff; min-width: 400px;">
                    <div style="padding: 15px 25px; background: #fff; border-bottom: 1px solid #e2e8f0;"><div style="font-size:0.75rem; font-weight:800; color:#0f172a; margin-bottom:8px;">COMPARAR CON OTRA PANTALLA</div><div style="display:flex; gap:8px;"><input type="text" id="input-comparacion-${p.id}" placeholder="Buscar por ID o nombre..." style="flex:1; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.8rem; outline:none; background:#f8fafc;" oninput="app.filtrarComparacion('${key}', '${p.id}', this.value)"></div></div>
                    <div style="flex: 1; overflow-y: auto; padding: 15px 25px; position:relative;"><div id="resultados-comparacion-${p.id}"><div style="text-align:center; color:#94a3b8; padding:40px 10px; font-size:0.85rem;">Escriba para buscar y comparar pantallas...</div></div><div id="panel-comparacion-${p.id}" style="display:none;"></div></div></div></div>`;
        modal.classList.add('active');
        document.getElementById('modal-radiografia').scrollTo(0,0);
        setTimeout(() => { const mapDiv = document.getElementById(`mapa-rad-orig-${p.id}`); if (mapDiv && !mapDiv._leaflet_id && mapDiv.clientWidth > 0) { const map = L.map(mapDiv, { zoomControl: true, attributionControl: false }).setView([p.lat, p.lng], 16); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map); L.marker([p.lat, p.lng]).addTo(map).bindPopup('<b>' + p.id + '</b><br>' + (p.nombre || '')).openPopup(); setTimeout(() => map.invalidateSize(), 200); } }, 500);
    }

    cerrarModalRadiografia(event) { if (event.target === event.currentTarget) this.cerrarModal('modal-radiografia'); }

    filtrarComparacion(key, idOriginal, query) {
        const resultadosDiv = document.getElementById(`resultados-comparacion-${idOriginal}`);
        if (!resultadosDiv) return;
        const q = query.toLowerCase().trim();
        if (q.length < 2) { resultadosDiv.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:40px 10px;">Escriba al menos 2 caracteres...</div>'; return; }
        const resultados = this.dbManager.rawData.filter(p => p.id !== idOriginal && (p.id.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q))).slice(0, 10);
        if (resultados.length === 0) { resultadosDiv.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:40px 10px;">No se encontraron pantallas</div>'; return; }
        resultadosDiv.innerHTML = resultados.map(p => `<div onclick="app.seleccionarPantallaComparacion('${key}', '${idOriginal}', '${p.id}')" style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:6px; cursor:pointer;" onmouseover="this.style.borderColor='var(--theme-color)';" onmouseout="this.style.borderColor='#e2e8f0';"><div><div style="font-weight:800; color:#0f172a; font-size:0.85rem;">${p.id}</div><div style="font-size:0.7rem; color:#64748b;">${p.nombre}</div></div><div style="font-size:0.75rem; font-weight:700; color:var(--theme-color);">Comparar</div></div>`).join('');
    }

    async seleccionarPantallaComparacion(key, idOriginal, idComparar) {
        const p1 = this.dbManager.rawData.find(x => x.id === idOriginal);
        const p2 = this.dbManager.rawData.find(x => x.id === idComparar);
        if (!p1 || !p2) return;
        const panelComparacion = document.getElementById(`panel-comparacion-${idOriginal}`);
        const resultadosDiv = document.getElementById(`resultados-comparacion-${idOriginal}`);
        if (resultadosDiv) resultadosDiv.style.display = 'none';
        const costo1 = this.calcularCostoUbicacion(p1, key);
        const costo2 = this.calcularCostoUbicacion(p2, key);
        const diff = Math.abs(costo1 - costo2);
        const masCaro = costo1 > costo2 ? p1.id : p2.id;
        const masBarato = costo1 < costo2 ? p1.id : p2.id;
        panelComparacion.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
                <div style="background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:10px; text-align:center;"><div style="font-size:0.6rem; color:#ef4444; font-weight:900;">MAYOR GASTO</div><div style="font-size:1rem; font-weight:900; color:#b91c1c;">${masCaro}</div><div style="font-size:0.8rem; color:#ef4444;">+${this.formatMoney(diff)}</div></div>
                <div style="background:#f0fdf4; border:1px solid #a7f3d0; padding:12px; border-radius:10px; text-align:center;"><div style="font-size:0.6rem; color:#10b981; font-weight:900;">MAYOR AHORRO</div><div style="font-size:1rem; font-weight:900; color:#047857;">${masBarato}</div><div style="font-size:0.8rem; color:#10b981;">-${this.formatMoney(diff)}</div></div></div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
                <div style="padding: 12px 20px; background: #fff; border-bottom: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;"><div><div style="font-size:0.7rem; color:#64748b; font-weight:800;">UBICACION EN COMPARACION</div><div style="font-size:1rem; font-weight:900; color:#0f172a;">${p2.id} - ${p2.nombre}</div></div><button onclick="app.cerrarComparacion('${idOriginal}')" style="background:#fee2e2; color:#dc2626; border:none; padding:6px 12px; border-radius:6px; font-size:0.65rem; font-weight:700; cursor:pointer;">Quitar</button></div>
                <div style="padding: 15px;"><div style="display:flex; gap:10px; margin-bottom:15px;"><div id="mapa-rad-comp-${p2.id}" style="flex:1; height:140px; border-radius:10px; border:1px solid #e2e8f0; overflow:hidden;"></div><div style="flex:1; height:140px; background:#e2e8f0; border-radius:10px; overflow:hidden; display:flex; align-items:center; justify-content:center; position:relative; border:1px solid #e2e8f0;"><span style="font-size:0.65rem; color:#64748b; font-weight:800;">SIN FOTO</span><img src="assets/fotos/${p2.id}.jpg" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:2;"></div></div>${this.renderExpedienteCompleto(p2)}</div></div>`;
        panelComparacion.style.display = 'block';
        setTimeout(() => { const mapDiv = document.getElementById(`mapa-rad-comp-${p2.id}`); if (mapDiv && !mapDiv._leaflet_id) { const map = L.map(mapDiv).setView([p2.lat, p2.lng], 16); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map); L.marker([p2.lat, p2.lng]).addTo(map).bindPopup('<b>' + p2.id + '</b>').openPopup(); setTimeout(() => map.invalidateSize(), 100); } }, 300);
    }

    calcularTotalCompleto(p) {
        let total = 0;
        const factorMeses = this.state.meses.includes('all') ? 1 : (this.state.meses.length / 12);
        if (p.carasVV) { Object.values(p.carasVV).forEach(cara => { Object.values(cara).forEach(val => { total += Number(val) || 0; }); }); }
        else if (p.capex) { Object.values(p.capex).forEach(val => { total += Number(val) || 0; }); }
        Object.values(OPEX_CONFIG).forEach(conf => { total += (conf.montoFijo * factorMeses) / 54; });
        (p.tickets || []).forEach(tk => { total += Number(tk.costoManttoOriginal) || 0; });
        return total;
    }

    cerrarComparacion(idOriginal) {
        const panelComparacion = document.getElementById(`panel-comparacion-${idOriginal}`);
        if (panelComparacion) { panelComparacion.style.display = 'none'; panelComparacion.innerHTML = ''; }
        const resultadosDiv = document.getElementById(`resultados-comparacion-${idOriginal}`);
        if (resultadosDiv) { resultadosDiv.style.display = 'block'; resultadosDiv.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:40px 10px;">Escriba para buscar y comparar pantallas...</div>'; }
        const inputComparacion = document.getElementById(`input-comparacion-${idOriginal}`);
        if (inputComparacion) { inputComparacion.value = ''; inputComparacion.focus(); }
    }

    abrirModalGeneral() { this.modalCtrl.renderResumenGeneral(this.state.unidad, this.state.modulo || 'capex', this.dbManager, this.state.meses); }

    abrirModalPantallas() {
        const pantallas = this.dbManager.getPantallasPorUnidad(this.state.unidad);
        this.modalCtrl.renderGridPantallas(pantallas, (id) => { const p = pantallas.find(x => x.id === id); if (p) this.modalCtrl.renderExpedienteCompleto(p, this.dbManager.diccionarios, this.state.meses); });
    }

    verExpedienteBusqueda(id) {
        const p = this.dbManager.rawData.find(x => x.id === id);
        if (p) this.modalCtrl.renderExpedienteCompleto(p, this.dbManager.diccionarios, this.state.meses);
        document.getElementById('search-dropdown').classList.remove('active');
        document.getElementById('global-search').value = '';
    }

    initBuscador() {
        const input = document.getElementById('global-search');
        const dropdown = document.getElementById('search-dropdown');
        if(!input) return;
        input.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            if (q.length < 2) return dropdown.classList.remove('active');
            const res = this.dbManager.rawData.filter(p => p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
            dropdown.innerHTML = res.map(p => `<div class="search-item" onclick="app.verExpedienteBusqueda('${p.id}')"><b>${p.id}</b><br><small>${p.nombre}</small></div>`).join('');
            dropdown.classList.add('active');
        });
    }

    irAPantalla(id) {
        const p = this.dbManager.rawData.find(x => x.id === id);
        if (!p) return alert("Pantalla no encontrada");
        if (!this.state.modulo) { this.construirNivel1(); setTimeout(() => { const nodoCap = document.querySelector(`.column[data-lvl="1"] .node[onclick*="'capex'"]`); if (nodoCap) this.seleccionarModulo('capex', nodoCap); setTimeout(() => this.irAPantalla(id), 300); }, 100); return; }
        setTimeout(() => { const nodosPant = document.querySelectorAll(`.node[onclick*="'${id}'"]`); if (nodosPant.length > 0) nodosPant[nodosPant.length - 1].click(); else alert("Navegue manualmente al modulo correspondiente."); }, 200);
    }

    navegarAComponente(key) {
        if (this.state.modulo !== 'capex') { 
            const nodoCap = document.querySelector('.column[data-lvl="1"] .node[onclick*="capex"]'); 
            if (nodoCap) this.seleccionarModulo('capex', nodoCap); 
        }
        setTimeout(() => { 
            const nodoComp = document.querySelector('.column[data-lvl="2"] .node[onclick*="' + key + '"]'); 
            if (nodoComp) nodoComp.click(); 
        }, 300);
    }
}
