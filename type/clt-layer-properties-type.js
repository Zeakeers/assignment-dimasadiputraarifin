class CLTLayerPropertiesType {
    constructor(data = {}) {
        this.layerIndex = data.layerIndex || 0;
        this.t_i = data.t_i || 0;
        this.y_i = data.y_i || 0;
        this.theta_i = data.theta_i || 0;
        this.E_i = data.E_i || 0;
        this.h_i = data.h_i || 0;
        this.G_i = data.G_i || 0;
        
        // Calculated bending components
        this.I_local = data.I_local || 0;
        this.I_parallel = data.I_parallel || 0;
        this.EiIi = data.EiIi || 0;
        
        // Gamma Method specific
        this.g_i = data.g_i !== undefined ? data.g_i : 1.0;
        this.a_i = data.a_i || 0;
        this.a_i_label = data.a_i_label || '';
        this.g_i_label = data.g_i_label || '';
    }
}