class PanelPropertiesType {
    constructor(method = '', eiEff = 0, layers = []) {
        this.method = method; // 'Shear Analogy' or 'Gamma'
        this.eiEff = eiEff; // N-mm^2/m
        this.layers = layers; // CLTLayerPropertiesType[]
        this.isValid = true;
        this.errorMessage = '';
    }
}