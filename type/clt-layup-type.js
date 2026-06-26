class CLTLayupType {
    constructor() {
        this.name = 'CLT Layup';
        /**
         * @type {CLTLayerType[]}
         */
        this.layers = [];
    }

    addLayer(layer) {
        this.layers.push(layer);
    }

    clearLayers() {
        this.layers = [];
    }

    getLayers() {
        return this.layers;
    }

    getTotalThickness() {
        return this.layers.reduce((sum, layer) => sum + layer.thickness, 0);
    }

    isSymmetric() {
        const N = this.layers.length;
        if (N === 0) return true;
        
        for (let i = 0; i < Math.floor(N / 2); i++) {
            const layerA = this.layers[i];
            const layerB = this.layers[N - 1 - i];
            
            if (layerA.thickness !== layerB.thickness) return false;
            if (layerA.angle !== layerB.angle) return false;
            if (layerA.materialGrade.name !== layerB.materialGrade.name) return false;
        }
        return true;
    }
}