ProgramManager.getInstance().addShader("color.fs", `

    precision highp float;

    // 颜色
    uniform vec4 uColor;

    void main() {
        gl_FragColor = uColor;
    }
    `);