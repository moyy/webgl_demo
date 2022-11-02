ProgramManager.getInstance().addShader("color.fs", `

    precision mediump float;

    // 颜色
    uniform vec4 uColor;

    void main() {
        gl_FragColor = uColor;
    }
    `);