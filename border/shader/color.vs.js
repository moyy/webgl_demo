ProgramManager.getInstance().addShader("color.vs", `
    
    precision mediump float;

    uniform mat4 uWorld;
    uniform mat4 uView;
    uniform mat4 uProj;
    
    attribute vec2 aVertexPosition;

    void main() {
        gl_Position = uProj * uView * uWorld * vec4(aVertexPosition, 0.0, 1.0);
    }
`);