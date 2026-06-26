// Controller class for CLT Calculator
class CLTCalculatorController {
    constructor() {
        this.initElements();
        this.bindEvents();
        this.runCalculation();
    }

    initElements() {
        this.inputGrade = document.getElementById('inputGrade');
        this.inputLayers = document.getElementById('inputLayers');
        this.inputThickness = document.getElementById('inputThickness');
        this.inputLength = document.getElementById('inputLength');
        this.inputBeff = document.getElementById('inputBeff');
        this.inputMethod = document.getElementById('inputMethod');
        this.toggleExcelBug = document.getElementById('toggleExcelBug');

        this.layupVisualizer = document.getElementById('layupVisualizer');
        this.errorBlock = document.getElementById('errorBlock');
        this.errorMessage = document.getElementById('errorMessage');
        this.outputBlock = document.getElementById('outputBlock');
        
        this.resultEiEff = document.getElementById('resultEiEff');
        this.resultsTable = document.getElementById('resultsTable');
        this.tableHeader = document.getElementById('tableHeader');
        this.tableBody = document.getElementById('tableBody');
        this.bugInfoBlock = document.getElementById('bugInfoBlock');
    }

    bindEvents() {
        const inputs = [
            this.inputGrade, this.inputLayers, this.inputThickness,
            this.inputLength, this.inputBeff, this.inputMethod, this.toggleExcelBug
        ];
        
        inputs.forEach(input => {
            input.addEventListener('change', () => this.runCalculation());
            input.addEventListener('input', () => this.runCalculation());
        });
    }

    formatExponential(val) {
        if (val === 0 || isNaN(val) || val === '-') return '0,00E+00';
        return val.toExponential(2).toUpperCase().replace('.', ',').replace('E+', 'E+');
    }

    formatFloat(val, decimals = 1) {
        if (val === 0 || isNaN(val)) return '0,0';
        if (val === '-') return '-';
        return val.toFixed(decimals).replace('.', ',');
    }

    runCalculation() {
        // Hide error initially
        this.errorBlock.style.display = 'none';
        this.outputBlock.style.display = 'block';

        // Read inputs
        const gradeName = this.inputGrade.value;
        const totalLayers = parseInt(this.inputLayers.value);
        const thickness = parseFloat(this.inputThickness.value);
        const length = parseFloat(this.inputLength.value);
        const beff = parseFloat(this.inputBeff.value);
        const method = this.inputMethod.value;
        const matchExcelBug = this.toggleExcelBug.checked;

        // Validation checks
        if (isNaN(thickness) || thickness <= 0) {
            this.showError("Ketebalan lapisan harus berupa angka positif.");
            return;
        }
        if (isNaN(length) || length <= 0) {
            this.showError("Panjang bentang harus berupa angka positif.");
            return;
        }
        if (isNaN(beff) || beff <= 0) {
            this.showError("Lebar efektif b_eff harus berupa angka positif.");
            return;
        }

        // Show/hide Excel Bug Info block
        if (matchExcelBug) {
            this.bugInfoBlock.style.display = 'block';
        } else {
            this.bugInfoBlock.style.display = 'none';
        }

        // 1. Dapatkan Grade Material
        const materialGrade = MaterialGrade.getGrade(gradeName);
        if (!materialGrade) {
            this.showError("Grade material tidak valid.");
            return;
        }

        // 2. Buat CLT Layup
        const layup = new CLTLayupType();
        // Alternating angle pattern: 0, 90, 0, 90, 0 ...
        for (let i = 0; i < totalLayers; i++) {
            const angle = (i % 2 === 0) ? 0 : 90;
            layup.addLayer(new CLTLayerType(thickness, angle, materialGrade));
        }

        // 3. Render Visual Layup
        this.renderLayupVisual(layup);

        // 4. Hitung menggunakan metode terpilih
        let calculator;
        if (method === 'Shear Analogy') {
            calculator = new ShearAnalogyMethod(length, beff, matchExcelBug);
        } else {
            calculator = new GammaMethod(length, beff, matchExcelBug);
        }

        const results = calculator.calculate(layup);

        if (!results.isValid) {
            this.showError(results.errorMessage);
            return;
        }

        // 5. Render Output Ke UI
        this.renderOutput(results, method, totalLayers);
    }

    showError(msg) {
        this.errorMessage.innerText = msg;
        this.errorBlock.style.display = 'block';
        this.outputBlock.style.display = 'none';
    }

    renderLayupVisual(layup) {
        this.layupVisualizer.innerHTML = '';
        const layers = layup.getLayers();
        
        // Render top to bottom (T1 = top, TN = bottom)
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            const div = document.createElement('div');
            div.className = `visual-layer layer-${layer.angle}`;
            div.innerHTML = `
                <span>T${i + 1} (${layer.angle}°)</span>
                <span>${layer.thickness} mm</span>
            `;
            this.layupVisualizer.appendChild(div);
        }
    }

    renderOutput(results, method, totalLayers) {
        // Render EI_eff value
        this.resultEiEff.innerText = this.formatExponential(results.eiEff);

        // Clear table
        this.tableHeader.innerHTML = '';
        this.tableBody.innerHTML = '';

        if (method === 'Shear Analogy') {
            // Render Shear Analogy Table
            // Header
            this.tableHeader.innerHTML = `
                <tr>
                    <th>[-]</th>
                    <th>beff ti³/12<br>(mm⁴)</th>
                    <th>beff ti hi²<br>(mm⁴)</th>
                    <th>Ei,XX<br>(MPa)</th>
                    <th>EiIi<br>(N-mm²/m)</th>
                </tr>
            `;

            // Excel Shear Analogy table has exactly 7 rows (T1 to T7)
            const maxRows = 7;
            for (let i = 0; i < maxRows; i++) {
                const tr = document.createElement('tr');
                
                if (i < results.layers.length) {
                    const prop = results.layers[i];
                    tr.innerHTML = `
                        <td>T${prop.layerIndex}</td>
                        <td>${this.formatExponential(prop.I_local)}</td>
                        <td>${this.formatExponential(prop.I_parallel)}</td>
                        <td>${this.formatFloat(prop.E_i, 1)}</td>
                        <td>${this.formatExponential(prop.EiIi)}</td>
                    `;
                } else {
                    // Inactive row (T6, T7)
                    tr.className = 'row-inactive';
                    tr.innerHTML = `
                        <td>T${i + 1}</td>
                        <td>0,00E+00</td>
                        <td>0,00E+00</td>
                        <td>0,0</td>
                        <td>0,00E+00</td>
                    `;
                }
                this.tableBody.appendChild(tr);
            }
            
            // Add total row
            const totalTr = document.createElement('tr');
            totalTr.className = 'total-row';
            totalTr.innerHTML = `
                <td colspan="4" style="text-align:right;">SEiIi XX</td>
                <td><strong>${this.formatExponential(results.eiEff)}</strong></td>
            `;
            this.tableBody.appendChild(totalTr);

        } else {
            // Render Gamma Method Table
            // Header
            this.tableHeader.innerHTML = `
                <tr>
                    <th>[-]</th>
                    <th>Ei<br>(MPa)</th>
                    <th>ai (lbl)</th>
                    <th>ai<br>(mm)</th>
                    <th>beff ti³/12<br>(mm⁴)</th>
                    <th>beff ti ai²<br>(mm⁴)</th>
                    <th>gi (lbl)</th>
                    <th>gi<br>(-)</th>
                    <th>EiIi eff<br>(N-mm²/m)</th>
                </tr>
            `;

            // Gamma Method table has exactly 5 rows in our UI (Layer 1 to Layer 5)
            // corresponding to the active layers.
            const maxRows = 5;
            for (let i = 0; i < maxRows; i++) {
                const tr = document.createElement('tr');
                
                if (i < results.layers.length) {
                    const prop = results.layers[i];
                    
                    const a_lbl = prop.a_i_label || '-';
                    const g_lbl = prop.g_i_label || '-';
                    
                    const is0Deg = prop.theta_i === 0;
                    
                    const a_val_str = is0Deg ? this.formatFloat(prop.a_i, 1) : '-';
                    const g_val_str = is0Deg ? this.formatFloat(prop.g_i, 3) : '-';
                    const i_local_str = is0Deg ? this.formatExponential(prop.I_local) : '-';
                    const i_para_str = is0Deg ? this.formatExponential(prop.I_parallel) : '-';
                    const e_i_str = is0Deg ? this.formatFloat(prop.E_i, 1) : '0,0';
                    
                    let e_i_i_eff_str = '-';
                    if (is0Deg) {
                        e_i_i_eff_str = this.formatExponential(prop.EiIi);
                    }
                    
                    tr.innerHTML = `
                        <td>Layer ${prop.layerIndex}</td>
                        <td>${e_i_str}</td>
                        <td>${a_lbl}</td>
                        <td>${a_val_str}</td>
                        <td>${i_local_str}</td>
                        <td>${i_para_str}</td>
                        <td>${g_lbl}</td>
                        <td>${g_val_str}</td>
                        <td>${e_i_i_eff_str}</td>
                    `;
                } else {
                    // Inactive row for 3-ply panel in a 5-row table
                    tr.className = 'row-inactive';
                    tr.innerHTML = `
                        <td>Layer ${i + 1}</td>
                        <td>0,0</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                    `;
                }
                this.tableBody.appendChild(tr);
            }

            // Add total row
            const totalTr = document.createElement('tr');
            totalTr.className = 'total-row';
            totalTr.innerHTML = `
                <td colspan="8" style="text-align:right;">SEiIi γ</td>
                <td><strong>${this.formatExponential(results.eiEff)}</strong></td>
            `;
            this.tableBody.appendChild(totalTr);
        }
    }
}

// Instantiate controller when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cltController = new CLTCalculatorController();
});