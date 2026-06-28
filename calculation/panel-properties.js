/**
 * Class Panel Properties is used to calculate the properties of panel CLT Layup.
 * Panel properties can calculate
 *  - Shear Analogy Method
 *  - Gamma Method
 * 
 * How to use : 
 * const calculator = new ShearAnalogyMethod(length, beff);
 * const properties = calculator.calculate(cltLayup);
 */

// Base class for panel properties
class PanelProperties {
    constructor(length = 5, beff = 1000) {
        this.length = length; // meters
        this.beff = beff; // mm
    }

    calculate(cltLayup) {
        throw new Error("calculate method must be implemented");
    }
}

class ShearAnalogyMethod extends PanelProperties {
    calculate(cltLayup) {
        const layers = cltLayup.getLayers();
        const N = layers.length;
        
        if (N === 0) {
            const result = new PanelPropertiesType('Shear Analogy', 0, []);
            result.isValid = false;
            result.errorMessage = "Tidak ada lapisan aktif.";
            return result;
        }

        // Cek simetris
        if (!cltLayup.isSymmetric()) {
            const result = new PanelPropertiesType('Shear Analogy', 0, []);
            result.isValid = false;
            result.errorMessage = "Susunan lapisan CLT harus simetris atas-bawah untuk metode Shear Analogy.";
            return result;
        }

        const layerPropertiesList = [];
        
        // Langkah 1: Hitung tebal (t_i), posisi titik berat (y_i)
        // y_i dihitung dari bawah: sum dari i s.d N-1 + t_i/2
        const thicknesses = layers.map(l => l.thickness);
        
        for (let i = 0; i < N; i++) {
            const layer = layers[i];
            const t_i = layer.thickness;
            const theta_i = layer.angle;
            const grade = layer.materialGrade;
            
            // y_i = jumlah tebal dari lapisan i sampai lapisan terbawah (N-1) + t_i/2
            let sumBelow = 0;
            for (let j = i; j < N; j++) {
                sumBelow += thicknesses[j];
            }
            const y_i = sumBelow - t_i / 2;
            
            // E_i,XX = E jika sudut 0, 0 jika sudut 90 (di XX-direction)
            const E_i = (theta_i === 0) ? grade.E : 0;
            
            // G_i = G jika sudut 0, G_90 jika sudut 90
            const G_i = (theta_i === 0) ? grade.G : grade.G_90;

            layerPropertiesList.push(new CLTLayerPropertiesType({
                layerIndex: i + 1,
                t_i: t_i,
                y_i: y_i,
                theta_i: theta_i,
                E_i: E_i,
                G_i: G_i
            }));
        }

        // Langkah 2: Hitung Neutral Axis (z_neutral)
        let z_neutral = 0;
        // Hitung sum(E_i * t_i * y_i) / sum(E_i * t_i) untuk sumbu netral gabungan
        let num = 0;
        let den = 0;
        for (let prop of layerPropertiesList) {
            num += prop.E_i * prop.t_i * prop.y_i;
            den += prop.E_i * prop.t_i;
        }
        z_neutral = den > 0 ? num / den : 0;

        // Langkah 3: Hitung h_i, inersia lokal, inersia parallel, dan EiIi
        let totalEiIi = 0;
        for (let prop of layerPropertiesList) {
            const h_i = Math.abs(prop.y_i - z_neutral);
            prop.h_i = h_i;
            
            // Inersia lokal: beff * t_i^3 / 12
            const I_local = (this.beff * Math.pow(prop.t_i, 3)) / 12;
            
            // Inersia parallel: beff * t_i * h_i^2
            const I_parallel = this.beff * prop.t_i * Math.pow(h_i, 2);
            
            prop.I_local = I_local;
            prop.I_parallel = I_parallel;
            
            // EiIi = E_i * (I_local + I_parallel)
            const EiIi = prop.E_i * (I_local + I_parallel);
            prop.EiIi = EiIi;
            
            totalEiIi += EiIi;
        }

        return new PanelPropertiesType('Shear Analogy', totalEiIi, layerPropertiesList);
    }
}

class GammaMethod extends PanelProperties {
    calculate(cltLayup) {
        const layers = cltLayup.getLayers();
        const N = layers.length;

        // Validasi jumlah lapisan
        if (N !== 3 && N !== 5) {
            const result = new PanelPropertiesType('Gamma', 0, []);
            result.isValid = false;
            result.errorMessage = "Metode Gamma hanya mendukung susunan 3 atau 5 lapisan kayu.";
            return result;
        }

        const L_ref = this.length * 1000; // ubah meter ke mm
        const layerPropertiesList = [];

        // Hitung tebal (t_i), posisi titik tengah geometris (y_i) masing-masing lapisan dari dasar
        const thicknesses = layers.map(l => l.thickness);
        const y_geom = [];
        
        for (let i = 0; i < N; i++) {
            let sumBelow = 0;
            for (let j = i; j < N; j++) {
                sumBelow += thicknesses[j];
            }
            y_geom.push(sumBelow - thicknesses[i] / 2);
        }

        if (N === 5) {
            // Lapisan: T1 (0), T2 (1), T3 (2), T4 (3), T5 (4)
            // Arah serat: T1=0, T2=90, T3=0, T4=90, T5=0
            const l1 = layers[0], l2 = layers[1], l3 = layers[2], l4 = layers[3], l5 = layers[4];
            
            // Properti elastis
            const E1 = (l1.angle === 0) ? l1.materialGrade.E : 0;
            const E3 = (l3.angle === 0) ? l3.materialGrade.E : 0;
            const E5 = (l5.angle === 0) ? l5.materialGrade.E : 0;
            
            const A1 = this.beff * l1.thickness;
            const A3 = this.beff * l3.thickness;
            const A5 = this.beff * l5.thickness;
            
            // Lapisan silang (cross layer) T2 menghubungkan T1 dan T3
            const t_cross_12 = l2.thickness;
            const G_rolling_12 = l2.materialGrade.G_90;
            const s_1 = (this.beff / t_cross_12) * G_rolling_12;
            
            // Lapisan silang (cross layer) T4 menghubungkan T3 dan T5
            const t_cross_34 = l4.thickness;
            const G_rolling_34 = l4.materialGrade.G_90;
            const s_3 = (this.beff / t_cross_34) * G_rolling_34;
            
            // Hitung gamma
            const gamma2 = 1.0; // Lapisan tengah/referensi
            
            const gamma1 = 1 / (1 + (Math.pow(Math.PI, 2) * E1 * A1) / (s_1 * Math.pow(L_ref, 2)));
            
            const gamma3 = 1 / (1 + (Math.pow(Math.PI, 2) * E5 * A5) / (s_3 * Math.pow(L_ref, 2)));

            // Hitung letak sumbu netral baru (a2) diukur dari pusat T3
            const y1 = y_geom[0], y3 = y_geom[2], y5 = y_geom[4];
            const num = gamma1 * E1 * A1 * (y1 - y3) - gamma3 * E5 * A5 * (y3 - y5);
            const den = gamma1 * E1 * A1 + gamma2 * E3 * A3 + gamma3 * E5 * A5;
            const a2 = den > 0 ? num / den : 0;
            
            const a1 = (y1 - y3) - a2;
            const a3 = (y3 - y5) + a2;

            // Buat CLTLayerPropertiesType
            for (let i = 0; i < 5; i++) {
                const layer = layers[i];
                let E_i = 0;
                let G_i = (layer.angle === 0) ? layer.materialGrade.G : layer.materialGrade.G_90;
                let g_i = 0;
                let a_i = 0;
                let a_i_label = '-';
                let g_i_label = '-';
                
                if (i === 0) { // T1
                    E_i = E1; g_i = gamma1; a_i = a1; a_i_label = 'a1'; g_i_label = 'g1';
                } else if (i === 2) { // T3
                    E_i = E3; g_i = gamma2; a_i = a2; a_i_label = 'a2'; g_i_label = 'g2';
                } else if (i === 4) { // T5
                    E_i = E5; g_i = gamma3; a_i = a3; a_i_label = 'a3'; g_i_label = 'g3';
                }

                const I_local = (this.beff * Math.pow(layer.thickness, 3)) / 12;
                const I_parallel = this.beff * layer.thickness * Math.pow(a_i, 2);
                
                let EiIi = 0;
                if (E_i > 0) {
                    EiIi = E_i * (I_local + g_i * I_parallel);
                }

                layerPropertiesList.push(new CLTLayerPropertiesType({
                    layerIndex: i + 1,
                    t_i: layer.thickness,
                    y_i: y_geom[i],
                    theta_i: layer.angle,
                    E_i: E_i,
                    G_i: G_i,
                    I_local: I_local,
                    I_parallel: I_parallel,
                    g_i: g_i,
                    a_i: a_i,
                    a_i_label: a_i_label,
                    g_i_label: g_i_label,
                    EiIi: EiIi
                }));
            }

            // Hitung total EI_eff yang sebenarnya
            const EI_eff_1 = E1 * ( (this.beff * Math.pow(l1.thickness, 3))/12 + gamma1 * A1 * Math.pow(a1, 2) );
            const EI_eff_3 = E3 * ( (this.beff * Math.pow(l3.thickness, 3))/12 + gamma2 * A3 * Math.pow(a2, 2) );
            const EI_eff_5 = E5 * ( (this.beff * Math.pow(l5.thickness, 3))/12 + gamma3 * A5 * Math.pow(a3, 2) );
            const totalEiIi = EI_eff_1 + EI_eff_3 + EI_eff_5;

            return new PanelPropertiesType('Gamma', totalEiIi, layerPropertiesList);

        } else if (N === 3) {
            // Lapisan: T1 (0), T2 (1), T3 (2)
            // Arah serat: T1=0, T2=90, T3=0
            const l1 = layers[0], l2 = layers[1], l3 = layers[2];
            
            const E1 = (l1.angle === 0) ? l1.materialGrade.E : 0;
            const E3 = (l3.angle === 0) ? l3.materialGrade.E : 0;
            
            const A1 = this.beff * l1.thickness;
            const A3 = this.beff * l3.thickness;
            
            const t_cross_12 = l2.thickness;
            const G_rolling_12 = l2.materialGrade.G_90;
            const s_1 = (this.beff / t_cross_12) * G_rolling_12;
            
            const gamma2 = 1.0; // T3 sebagai referensi
            const gamma1 = 1 / (1 + (Math.pow(Math.PI, 2) * E1 * A1) / (s_1 * Math.pow(L_ref, 2)));

            const y1 = y_geom[0], y3 = y_geom[2];
            const num = gamma1 * E1 * A1 * (y1 - y3);
            const den = gamma1 * E1 * A1 + gamma2 * E3 * A3;
            const a2 = den > 0 ? num / den : 0;
            
            const a1 = (y1 - y3) - a2;

            for (let i = 0; i < 3; i++) {
                const layer = layers[i];
                let E_i = 0;
                let G_i = (layer.angle === 0) ? layer.materialGrade.G : layer.materialGrade.G_90;
                let g_i = 0;
                let a_i = 0;
                let a_i_label = '-';
                let g_i_label = '-';
                
                if (i === 0) {
                    E_i = E1; g_i = gamma1; a_i = a1; a_i_label = 'a1'; g_i_label = 'g1';
                } else if (i === 2) {
                    E_i = E3; g_i = gamma2; a_i = a2; a_i_label = 'a2'; g_i_label = 'g2';
                }

                const I_local = (this.beff * Math.pow(layer.thickness, 3)) / 12;
                const I_parallel = this.beff * layer.thickness * Math.pow(a_i, 2);
                
                let EiIi = 0;
                if (E_i > 0) {
                    EiIi = E_i * (I_local + g_i * I_parallel);
                }

                layerPropertiesList.push(new CLTLayerPropertiesType({
                    layerIndex: i + 1,
                    t_i: layer.thickness,
                    y_i: y_geom[i],
                    theta_i: layer.angle,
                    E_i: E_i,
                    G_i: G_i,
                    I_local: I_local,
                    I_parallel: I_parallel,
                    g_i: g_i,
                    a_i: a_i,
                    a_i_label: a_i_label,
                    g_i_label: g_i_label,
                    EiIi: EiIi
                }));
            }

            const EI_eff_1 = E1 * ( (this.beff * Math.pow(l1.thickness, 3))/12 + gamma1 * A1 * Math.pow(a1, 2) );
            const EI_eff_3 = E3 * ( (this.beff * Math.pow(l3.thickness, 3))/12 + gamma2 * A3 * Math.pow(a2, 2) );
            const totalEiIi = EI_eff_1 + EI_eff_3;

            return new PanelPropertiesType('Gamma', totalEiIi, layerPropertiesList);
        }
    }
}


