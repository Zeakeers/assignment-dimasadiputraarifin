class MaterialGrade {
    constructor(name, E, E90, G, G90) {
        this.name = name;
        this.E = E; // MPa
        this.E_90 = E90; // MPa
        this.G = G; // MPa
        this.G_90 = G90; // MPa (Rolling Shear Modulus, also G_R)
    }

    static getGrade(name) {
        const grades = {
            'MGP10': new MaterialGrade('MGP10', 1100, 110, 687.5, 62.5),
            'MGP12': new MaterialGrade('MGP12', 1100, 110, 687.5, 62.5)
        };
        return grades[name] || null;
    }
}