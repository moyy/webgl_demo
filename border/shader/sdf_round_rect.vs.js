ProgramManager.getInstance().addShader("sdf_round_rect.vs", `
    
    precision highp float;

    uniform mat4 uWorld;
    uniform mat4 uView;
    uniform mat4 uProj;

    attribute vec2 aVertexPosition;

    varying vec2 vVertexPosition;

    void main() {
        
        vVertexPosition = aVertexPosition;

        gl_Position = uProj * uView * uWorld * vec4(aVertexPosition, 0.0, 1.0);
    }
`);